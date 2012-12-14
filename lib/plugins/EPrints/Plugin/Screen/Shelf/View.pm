
package EPrints::Plugin::Screen::Shelf::View;

use EPrints::Plugin::Screen::Shelf;

@ISA = ( 'EPrints::Plugin::Screen::Shelf' );

use strict;

sub new
{
        my( $class, %params ) = @_;

        my $self = $class->SUPER::new(%params);

        $self->{icon} = "action_shelf_view.png";

        $self->{appears} = [
                {
                        place => "shelf_item_actions",
                        position => 100,
                },
        ];

        return $self;
}

sub can_be_viewed
{
	my( $self ) = @_;

	return (
		$self->{processor}->{shelf}->has_reader($self->{processor}->{user}) or
		( $self->{processor}->{shelf}->get_value( "public" ) eq "TRUE" )
	);
}

sub render
{
	my( $self ) = @_;

	my $shelf = $self->{processor}->{shelf};
	my $session = $self->{session};

	my $chunk = $session->make_doc_fragment;

	$chunk->appendChild( $self->render_action_list_bar( "shelf_view_actions", ['shelfid'] ) );

	if ($shelf->is_set('description'))
	{
		my $p = $session->make_element('p');
		$p->appendChild($shelf->render_value('description'));
		$chunk->appendChild($p);
	}

        $chunk->appendChild($shelf->render_export_bar);

	my $table = $session->make_element('table');
	$chunk->appendChild($table);

	my %hidden_items = map { $_ => 1 } @{$shelf->get_hidden_items()||[]};

	my $n = 1;
	my $info = { n => $n, table => $table, hidden_items => \%hidden_items };

	$shelf->map( sub { 
		my( $session, $ds, $eprint, $info ) = @_; 
	
		my $tr;
		my $status = $eprint->get_value('eprint_status');

		if ($status eq 'archive')
		{
			$tr = $eprint->render_citation_link('result', n => [$info->{n}++, "INTEGER"]);
		}
		else
		{
			$tr = $eprint->render_citation_link_staff('result_with_status', n => [ $info->{n}++, "INTEGER"]);
		}
		
		if( $info->{hidden_items}->{$eprint->get_id} )
		{
			my $el = $tr->getElementsByTagName( 'tr' )->[0];
			if( defined $el )
			{
				my $classes = $el->getAttribute( 'class' ) || "";
				$classes .= " ep_shelves_item_hidden";
				$el->setAttribute( 'class', $classes );
			}
		}

		$info->{table}->appendChild($tr);

	}, $info );

	return $chunk;
}

1;

