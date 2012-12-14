#
# EPrints Services/sf2 - 2011-05-09 - Shelf DataObj 
#
 

$c->{fields}->{user} = [] if !defined $c->{fields}->{user};
unshift @{$c->{fields}->{user}}, (
               { name=>"shelves_fields", type=>"fields", datasetid=>"shelf",
                        multiple=>1, input_ordered=>1, required=>1, volatile=>1 },
);



$c->{datasets}->{shelf} = {
        class => "EPrints::DataObj::Shelf",
        sqlname => "shelf",
        name => "shelf",
        columns => [qw( shelfid )],
        index => 1,
        import => 1,
#        search => {
#                simple => {
#                        search_fields => [{
#                                id => "q",
#                                meta_fields => [qw(
#                                        shelfid
#                                )],
#                        }],
#                        order_methods => {
#                                "byuserid"         =>  "userid",
#                        },
#                        default_order => "byuserid",
#                        show_zero_results => 1,
#                        citation => "result",
#                },
#        },
};

$c->{fields}->{shelf} = [] if !defined $c->{fields}->{shelf};
unshift @{$c->{fields}->{shelf}}, (
		{ name=>"shelfid", type=>"counter", required=>1, import=>0, can_clone=>1, sql_counter => "shelfid"},
		{ name=>"rev_number", type=>"int", required=>1, can_clone=>0 },
		{ name=>"userid", type=>"itemref", datasetid=>"user", required=>1 },
		{ name=>"adminids", type=>"username", multiple=>1, input_cols => 20 },
		{ name=>"editorids", type=>"username", multiple =>1, input_cols => 20 },
		{ name=>"readerids", type=>"username", multiple =>1, input_cols => 20 },
		{ name=>"title", type=>"text" },
		{ name=>"description", type=>"longtext" },
		{ name=>"public", type=>"boolean", input_style=>"radio" },
                { name=>"items", type=>"itemref", datasetid=>"eprint", multiple=>1, required=>1 },
		{ name=>"hidden_items", type => "itemref", datasetid => "eprint", multiple=>1 },
		{ name=>"datestamp", type=>"time", required=>0, import=>0,
			render_res=>"minute", render_style=>"short", can_clone=>0 },
		{ name=>"lastmod", type=>"time", required=>0, import=>0,
			render_res=>"minute", render_style=>"short", can_clone=>0 },
);


{
no warnings;

package EPrints::DataObj::Shelf;

@EPrints::DataObj::Shelf::ISA = qw( EPrints::DataObj );

sub get_dataset_id { "shelf" }

sub create
{
	my( $class, $session, $userid ) = @_;

	return EPrints::DataObj::Shelf->create_from_data( 
		$session, 
		{ userid => $userid },
		$session->dataset( "shelf" ) );
}

sub create_from_data
{
        my( $class, $session, $data, $dataset ) = @_;

        my $new_shelf = $class->SUPER::create_from_data( $session, $data, $dataset );

        $session->get_database->counter_minimum( "shelfid", $new_shelf->get_id );

        return $new_shelf;
}

sub get_defaults
{
	my( $class, $session, $data ) = @_;

	my $id = $session->get_database->counter_next( "shelfid" );

	$data->{shelfid} = $id;
	$data->{rev_number} = 1;
	$data->{public} = "FALSE";
	$data->{datestamp} = EPrints::Time::get_iso_timestamp(); 

	unless( defined $data->{userid} )
	{
		$data->{userid} = $session->current_user->get_id;
	}

	#administrator gets defaulted to creators
	$data->{adminids} = [$data->{userid}];

	return $data;
}	

sub get_user
{
	my( $self ) = @_;

	return $self->{session}->dataset( 'user' )->dataobj( $self->get_value( 'userid' ) );
}

sub has_owner
{
	my( $self, $possible_owner ) = @_;

	return $possible_owner->get_value( "userid" ) == $self->get_value( "userid" ) ? 1 : 0;
}

sub has_admin
{
	my( $self, $possible_admin ) = @_;

	my $possible_adminid = $possible_admin->get_value('userid');

	foreach my $adminid (@{$self->get_value('adminids')})
	{
		return 1 if $possible_adminid == $adminid;
	}

	if ($self->{session}->can_call('is_shelf_administrator'))
	{
		return $self->{session}->call('is_shelf_administrator', $self, $possible_admin);
	}

	return 0;
}

sub has_editor
{
	my( $self, $possible_editor ) = @_;

	my $possible_editorid = $possible_editor->get_value('userid');

	foreach my $editorid (@{$self->get_value('editorids')})
	{
		return 1 if $possible_editorid == $editorid;
	}

	return $self->has_admin($possible_editor); #admins are always editors 
}

sub has_reader
{
	my( $self, $possible_reader ) = @_;

	my $possible_readerid = $possible_reader->get_value('userid');

	foreach my $readerid (@{$self->{readerids}})
	{
		return 1 if $possible_readerid == $readerid;
	}

	return $self->has_editor($possible_reader); #editors are always readers
}

sub is_public
{
	my( $self ) = @_;
	
	return ($self->get_value( 'public' ) eq 'TRUE' ) ? 1 : 0;
}

sub get_url
{
	my( $self , $staff ) = @_;

	return undef unless( $self->is_public() );

	return $self->{session}->config( "http_cgiurl" )."/shelf?shelfid=".$self->get_id;
}

sub is_item_visible
{
	my( $self, $eprintid ) = @_;

	my %hidden_items = map { $_ => 1 } @{$self->get_hidden_items() || []};
	
	return $hidden_items{$eprintid} ? 0 : 1;
}

sub get_hidden_items
{
	my( $self ) = @_;

	return $self->get_value( 'hidden_items' );
}

sub hide_item
{
	my( $self, $eprintid ) = @_;

	my %hidden_items = map { $_ => 1 } @{$self->get_hidden_items() || []};

	$hidden_items{$eprintid} = 1;
	
	my @new_items = keys %hidden_items;

	$self->set_value( "hidden_items", \@new_items );
	$self->commit;	
}

sub show_item
{
	my( $self, $eprintid ) = @_;
	
	my %hidden_items = map { $_ => 1 } @{$self->get_hidden_items() || []};

	return unless( defined $hidden_items{$eprintid} );
	
	delete $hidden_items{$eprintid};
	
	my @new_items = keys %hidden_items;

	$self->set_value( "hidden_items", \@new_items );
	$self->commit;	
}


sub get_item_ids
{
	my ( $self ) = @_;

	return $self->get_value('items');
}

sub is_in_shelf
{
	my( $self, $eprintid ) = @_;

	my $ids = $self->get_item_ids();

	my %map = map { $_ => 1 } @$ids;

	return (defined $map{$eprintid}) ? 1 : 0;
}

sub add_items
{
	my( $self, @eprintids ) = @_;

	my $current_eprintids = $self->get_item_ids(1);

	my %uniq_epids = map { $_ => 1 } ( @$current_eprintids, @eprintids );
	my @uniq_epids = keys %uniq_epids; 

	$self->set_value( 'items', \@uniq_epids );
	$self->commit;
}

sub empty
{
	my( $self ) = @_;

	$self->set_value( 'items', undef );
	$self->commit;
}

sub remove_items
{
	my ($self, @items_to_delete) = @_;

	my $items = $self->get_value('items');

	my %items_to_delete = map { $_ => 1 } @items_to_delete;

	my $new_items = [];
	foreach my $item (@{$items})
	{
		next if $items_to_delete{$item};
		push @{$new_items}, $item;
	} 

	$self->set_value('items', $new_items);
	$self->commit;
}

# maps the function $fn to the eprints contained in this shelf, see EPrints::List::map for details
sub map
{
	my( $self, $fn, $info ) = @_;

	my $ids = $self->get_value( 'items' );

	my $list = EPrints::List->new( ids => $self->get_value( 'items' ), 
			dataset => $self->{session}->dataset( 'eprint' ),
			session => $self->{session}
	);

	$list->map( $fn, $info );
}

sub get_items
{
	my ($self) = @_;

	my $session = $self->{session};

        my $ds = $session->dataset( 'eprint' );

	my $items = [];

	return $items unless $self->is_set('items');

	foreach my $eprintid (@{$self->get_value('items')})
	{
		my $eprint = $ds->dataobj( $eprintid );
		next unless( defined $eprint );
		push @{$items},  $eprint;
	}

        return $items;
}

sub commit
{
	my( $self, $force ) = @_;
	
	if( !defined $self->{changed} || scalar( keys %{$self->{changed}} ) == 0 )
	{
		# don't do anything if there isn't anything to do
		return( 1 ) unless $force;
	}

	if( $self->{non_volatile_change} )
	{
		$self->set_value( "rev_number", ($self->get_value( "rev_number" )||0) + 1 );
		$self->set_value ("lastmod", EPrints::Time::get_iso_timestamp ());
	}

	$self->tidy;

	my $success = $self->{session}->get_database->update(
		$self->{session}->dataset( 'shelf' ),
		$self->{data},
		$self->{changed} );

	$self->queue_changes;
	
	return( $success );
}


######################################################################
=pod

=item $success = $shelf->remove

Remove this shelf from the database. 

=cut
######################################################################

sub remove
{
        my( $self ) = @_;

        my $success = 1;

        # remove user record
        $success = $success && $self->{session}->get_database->remove(
        	$self->{session}->dataset( "shelf" ),
                $self->get_value( "shelfid" ) );

        return( $success );
}



sub render_export_bar
{
        my ($self) = @_;

	my $shelfid = $self->get_id;
	my $session = $self->{session};

	my $user = $session->current_user;

        my %opts = (
                        type=>"Export",
                        can_accept=>"list/eprint",
                        is_visible=>"all",
        );

	
	if (defined $user)
	{
		my $usertype = $user->get_value('usertype');
		if ($usertype eq 'admin' or $usertype eq 'editor')
		{
			$opts{is_visible} = 'staff';
		}
	}

        my @plugins = $session->plugin_list( %opts );

        if( scalar @plugins == 0 )
        {
                return $session->make_doc_fragment;
        }

        my $export_url = $session->config( "perl_url" )."/exportshelf";

        my $feeds = $session->make_doc_fragment;
        my $tools = $session->make_doc_fragment;
        my $options = {};
        foreach my $plugin_id ( @plugins )
        {
		# don't show our own plugin
		next if( $plugin_id eq 'Export::AddToShelf' );

                $plugin_id =~ m/^[^:]+::(.*)$/;
                my $id = $1;
                my $plugin = $session->plugin( $plugin_id );
                my $dom_name = $plugin->render_name;
                if( $plugin->is_feed || $plugin->is_tool )
                {
                        my $type = "feed";
                        $type = "tool" if( $plugin->is_tool );
                        my $span = $session->make_element( "span", class=>"ep_search_$type" );

                        my $fn = 'shelf_' . $shelfid; #use title of shelf?
                        my $url = $export_url."/".$shelfid."/$id/$fn".$plugin->param("suffix");

                        my $a1 = $session->render_link( $url );
                        my $icon = $session->make_element( "img", src=>$plugin->icon_url(), alt=>"[$type]", border=>0 );
                        $a1->appendChild( $icon );
                        my $a2 = $session->render_link( $url );
                        $a2->appendChild( $dom_name );
                        $span->appendChild( $a1 );
                        $span->appendChild( $session->make_text( " " ) );
                        $span->appendChild( $a2 );

                        if( $type eq "tool" )
                        {
                                $tools->appendChild( $session->make_text( " " ) );
                                $tools->appendChild( $span );
                        }
                        if( $type eq "feed" )
                        {
                                $feeds->appendChild( $session->make_text( " " ) );
                                $feeds->appendChild( $span );
                        }
                }
                else
                {
                        my $option = $session->make_element( "option", value=>$id );
                        $option->appendChild( $dom_name );
                        $options->{EPrints::XML::to_string($dom_name, undef, 1 )} = $option;
                }
        }

        my $select = $session->make_element( "select", name=>"format" );
        foreach my $optname ( sort keys %{$options} )
        {
                $select->appendChild( $options->{$optname} );
        }
        my $button = $session->make_doc_fragment;
        $button->appendChild( $session->render_button(
                        name=>"_action_export_redir",
                        value=>$session->phrase( "lib/searchexpression:export_button" ) ) );
        $button->appendChild(
                $session->render_hidden_field( "shelfid", $shelfid ) );

        my $form = $session->render_form( "GET", $export_url );
        $form->appendChild( $session->html_phrase( "Update/Views:export_section",
                                        feeds => $feeds,
                                        tools => $tools,
                                        menu => $select,
                                        button => $button ));

        return $form;
}


sub get_control_url
{
        my( $self ) = @_;

        return $self->{session}->config( "http_cgiurl" )."/users/home?screen=Shelf::View&shelfid=".$self->get_value( "shelfid" );
}

} # end of dataobj declaration
