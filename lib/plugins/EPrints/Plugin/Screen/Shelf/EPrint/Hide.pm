package EPrints::Plugin::Screen::Shelf::EPrint::Hide;

our @ISA = ( 'EPrints::Plugin::Screen::Shelf::EPrint' );

use strict;

sub new
{
	my( $class, %params ) = @_;

	my $self = $class->SUPER::new(%params);

	$self->{action_icon} = { hide => "minus.png" };

	$self->{appears} = [
		{
			place => "shelf_items_eprint_actions",
			position => 400,
			action => "hide",
		},
	];
	
	$self->{actions} = [qw/ hide /];

	return $self;
}

sub can_be_viewed
{
	my( $self ) = @_;
	
	return 0 unless($self->{processor}->{shelf}->has_editor($self->{processor}->{user}));

	my $eprint = $self->{processor}->{eprint};

	return 0 unless( defined $eprint );

	return $self->{processor}->{shelf}->is_item_visible( $eprint->get_id );
}

sub allow_hide
{
	my( $self ) = @_;

	return $self->can_be_viewed;
}

sub action_hide
{
	my( $self ) = @_;

        my $eprintid = $self->{session}->param('eprintid');

        $self->{processor}->{shelf}->hide_item($eprintid);

        my $plugin_for_redirect = $self->{session}->plugin( 'Screen::Shelf::EditItems', processor=>$self->{processor} );
        $self->{processor}->{screenid} = "Shelf::EditItems";
        $self->{session}->redirect($plugin_for_redirect->redirect_to_me_url);

}


1;
